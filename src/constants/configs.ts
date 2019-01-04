// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export const MAX_CLASS_PATH_LENGTH: number = 4096;
export const CHILD_PROCESS_MAX_BUFFER_SIZE: number = 1024 * 1024;

export const LOG_FILE_NAME: string = 'java_test_runner.log';
export const LOG_FILE_MAX_SIZE: number = 5 * 1024 * 1024;
export const LOG_FILE_MAX_NUMBER: number = 2;
export const LOG_LEVEL_SETTING_KEY: string = 'java.test.log.level';
export const DEFAULT_LOG_LEVEL: string = 'info';

export const REPORT_POSITION_SETTING_KEY: string = 'java.test.report.position';
export const DEFAULT_REPORT_POSITION: string = 'sideView';

export const CWD_KEY: string = 'java.test.cwd';
export const DEFAULT_CWD: string = '${workspaceFolder}';
export const ARGS_KEY: string = 'java.test.args';
export const VM_ARGS_KEY: string = 'java.test.vmargs';
export const ENV_KEY: string = 'java.test.env';
export const PRE_LAUNCH_TASK_KEY: string = 'java.test.preLaunchTask';
