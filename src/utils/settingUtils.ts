// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri, ViewColumn, workspace, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { ARGS_KEY, CWD_KEY, DEFAULT_CWD, DEFAULT_LOG_LEVEL, DEFAULT_REPORT_POSITION, ENV_KEY, LOG_LEVEL_SETTING_KEY,
    PRE_LAUNCH_TASK_KEY, REPORT_POSITION_SETTING_KEY, VM_ARGS_KEY } from '../constants/configs';

export function getReportPosition(): ViewColumn {
    const config: WorkspaceConfiguration = workspace.getConfiguration();
    const position: string = config.get<string>(REPORT_POSITION_SETTING_KEY, DEFAULT_REPORT_POSITION);
    return position === DEFAULT_REPORT_POSITION ? ViewColumn.Two : ViewColumn.Active;
}

export function getLogLevel(): string {
    return workspace.getConfiguration().get<string>(LOG_LEVEL_SETTING_KEY, DEFAULT_LOG_LEVEL);
}

export function getCwd(resource?: Uri): string | undefined {
    const cwd: string = workspace.getConfiguration(undefined, resource).get<string>(CWD_KEY, DEFAULT_CWD);
    if (/\$\{workspaceFolder\}/.test(cwd.trim())) {
        if (resource) {
            const workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(resource);
            if (workspaceFolder) {
                return workspaceFolder.uri.fsPath;
            }
        }
        throw Error('Failed to parse ${workspaceFolder}');
    }
    return cwd;
}

export function getArgs(resource?: Uri): string[] {
    return workspace.getConfiguration(undefined, resource).get<string[]>(ARGS_KEY, []);
}

export function getVmArgs(resource?: Uri): string[] {
    return workspace.getConfiguration(undefined, resource).get<string[]>(VM_ARGS_KEY, []);
}

export function getEnv(resource?: Uri): {} {
    return workspace.getConfiguration(undefined, resource).get<{}>(ENV_KEY, {});
}

export function getPrelaunchTaskName(resource?: Uri): string {
    return workspace.getConfiguration(undefined, resource).get<string>(PRE_LAUNCH_TASK_KEY, '');
}
