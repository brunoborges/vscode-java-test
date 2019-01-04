// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from 'child_process';
import * as fse from 'fs-extra';
import * as getPort from 'get-port';
import * as os from 'os';
import * as path from 'path';
import { debug, Uri, workspace } from 'vscode';
import { logger } from '../../logger/logger';
import { ITestItem } from '../../protocols';
import * as classpathUtils from '../../utils/classpathUtils';
import { resolveRuntimeClassPath } from '../../utils/commandUtils';
import { killProcess } from '../../utils/cpUtils';
import { getArgs, getCwd, getEnv, getVmArgs } from '../../utils/settingUtils';
import { ITestRunner } from '../ITestRunner';
import { ITestResult } from '../models';
import { BaseRunnerResultAnalyzer } from './BaseRunnerResultAnalyzer';

export abstract class BaseRunner implements ITestRunner {
    protected process: cp.ChildProcess | undefined;
    protected storagePathForCurrentSession: string | undefined;
    protected port: number | undefined;
    protected tests: ITestItem[];
    protected isDebug: boolean;
    protected classpath: string;
    protected isCanceled: boolean;
    protected workspaceFolderUri: Uri | undefined;

    constructor(
        protected javaHome: string,
        protected storagePath: string | undefined,
        protected extensionPath: string) {}

    public abstract getTestResultAnalyzer(): BaseRunnerResultAnalyzer;

    public get runnerDir(): string {
        return path.join(this.extensionPath, 'server');
    }

    public get runnerMainClassName(): string {
        return 'com.microsoft.java.test.runner.Launcher';
    }

    public async setup(tests: ITestItem[], workspaceFolderUri: Uri | undefined, isDebug: boolean = false): Promise<void> {
        const runnerJarFilePath: string = await this.getRunnerJarFilePath();
        this.port = isDebug ? await getPort() : undefined;
        this.tests = tests;
        this.isDebug = isDebug;
        const testPaths: string[] = tests.map((item: ITestItem) => Uri.parse(item.uri).fsPath);
        const classpaths: string[] = [...await resolveRuntimeClassPath(testPaths), runnerJarFilePath];
        this.storagePathForCurrentSession = path.join(this.storagePath || os.tmpdir(), new Date().getTime().toString());
        this.classpath = await classpathUtils.getClassPathString(classpaths, this.storagePathForCurrentSession);
        this.workspaceFolderUri = workspaceFolderUri;
    }

    public async run(): Promise<ITestResult[]> {
        const commandParams: string[] = await this.constructCommandParams();
        const options: cp.SpawnOptions = { cwd: getCwd(this.workspaceFolderUri), env: process.env };
        options.env = {...getEnv(this.workspaceFolderUri), ...options.env};
        return new Promise<ITestResult[]>((resolve: (result: ITestResult[]) => void, reject: (error: Error) => void): void => {
            const testResultAnalyzer: BaseRunnerResultAnalyzer = this.getTestResultAnalyzer();
            let buffer: string = '';
            this.process = cp.spawn(path.join(this.javaHome, 'bin', 'java'), commandParams, options);
            this.process.on('error', (error: Error) => {
                logger.error('Failed to launch the runner', error);
                reject(error);
            });
            this.process.stderr.on('data', (data: Buffer) => {
                testResultAnalyzer.analyzeError(data.toString());
            });
            this.process.stdout.on('data', (data: Buffer) => {
                buffer = buffer.concat(data.toString());
                const index: number = buffer.lastIndexOf(os.EOL);
                if (index >= 0) {
                    testResultAnalyzer.analyzeData(buffer.substring(0, index));
                    buffer = buffer.substring(index);
                }
            });
            this.process.on('close', (signal: number) => {
                if (this.isCanceled) {
                    return resolve([]);
                }
                if (buffer.length > 0) {
                    testResultAnalyzer.analyzeData(buffer);
                }
                const result: ITestResult[] = testResultAnalyzer.feedBack();
                if (signal && signal !== 0) {
                    reject(new Error(`Runner exited with code ${signal}.`));
                } else {
                    resolve(result);
                }
            });
            if (this.isDebug) {
                setTimeout(() => {
                    debug.startDebugging(this.workspaceFolderUri ? workspace.getWorkspaceFolder(this.workspaceFolderUri) : undefined, {
                        name: 'Debug Java Tests',
                        type: 'java',
                        request: 'attach',
                        hostName: 'localhost',
                        port: this.port,
                    });
                }, 500);
            }
        });
    }

    public async cleanUp(isCancel: boolean): Promise<void> {
        this.isCanceled = isCancel;
        try {
            if (this.process) {
                await killProcess(this.process);
                this.process = undefined;
            }
            if (this.storagePathForCurrentSession) {
                await fse.remove(this.storagePathForCurrentSession);
                this.storagePathForCurrentSession = undefined;
            }
        } catch (error) {
            logger.error('Failed to clean up', error);
        }
    }

    public constructCommandParams(): string[] {
        const commandParams: string[] = [];
        commandParams.push('-cp', this.classpath);

        if (this.isDebug) {
            commandParams.push('-Xdebug', `-Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=${this.port}`);
        }

        const resourceUri: Uri = Uri.parse(this.tests[0].uri);

        const vmargs: string[] = getVmArgs(resourceUri);
        if (vmargs.length > 0) {
            commandParams.push(...vmargs);
        }

        const args: string[] = getArgs(resourceUri);
        if (args.length > 0) {
            commandParams.push(...args);
        }

        commandParams.push(this.runnerMainClassName);
        return commandParams;
    }

    private async getRunnerJarFilePath(): Promise<string> {
        const runnerPath: string = path.join(this.runnerDir, 'com.microsoft.java.test.runner-jar-with-dependencies.jar');
        if (await fse.pathExists(runnerPath)) {
            return runnerPath;
        }
        throw new Error('Failed to find runner jar file.');
    }
}
