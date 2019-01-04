// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri } from 'vscode';
import { ITestItem } from '../protocols';
import { ITestResult } from './models';

export interface ITestRunner {
    setup(tests: ITestItem[], workspaceFolderUri: Uri | undefined, isDebug: boolean): Promise<void>;
    run(): Promise<ITestResult[]>;
    cleanUp(isCancel: boolean): Promise<void>;
}
