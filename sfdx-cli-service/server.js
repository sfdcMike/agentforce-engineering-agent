require('dotenv').config();
const jsforce = require('jsforce');
const { spawn } = require('child_process');

const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com' // Or your sandbox login URL
});

conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN, (err, userInfo) => {
    if (err) {
        return console.error('Salesforce login error:', err);
    }
    console.log('Logged in to Salesforce as:', userInfo.id);

    const scratchOrgEventStream = conn.streaming.topic('/event/ScratchOrgRequestEvent__e').subscribe((message) => {
        console.log('Received ScratchOrgRequestEvent:', message.payload);
        const { orgAlias__c, definitionFilePath__c, durationDays__c } = message.payload;
        createScratchOrg(orgAlias__c, definitionFilePath__c, durationDays__c);
    });
    console.log('Subscribed to ScratchOrgRequestEvent__e');

    const deployBranchEventStream = conn.streaming.topic('/event/BranchDeployRequestEvent__e').subscribe((message) => {
        console.log('Received BranchDeployRequestEvent:', message.payload);
        const { orgAlias__c, branchName__c } = message.payload;
        deployBranch(orgAlias__c, branchName__c);
    });
    console.log('Subscribed to BranchDeployRequestEvent__e');
});

function createScratchOrg(orgAlias, definitionFilePath, durationDays) {
    console.log(`Creating scratch org: Alias=<span class="math-inline">\{orgAlias\}, Definition\=</span>{definitionFilePath}, Duration=${durationDays}`);
    const command = 'sfdx';
    const args = ['force:org:create', '-s', '-f', definitionFilePath, '-a', orgAlias, '-d', durationDays.toString()];

    executeSfdxCommand(command, args, orgAlias, 'create');
}

function deployBranch(orgAlias, branchName) {
    console.log(`Deploying branch '${branchName}' to org: ${orgAlias}`);
    const command = 'sfdx';
    const args = ['force:source:deploy', '-u', orgAlias, '-p', 'force-app', '--branch', branchName];

    executeSfdxCommand(command, args, orgAlias, 'deploy', branchName); // Pass branchName for deploy results
}

function executeSfdxCommand(command, args, orgAlias, operationType, branchName = null) {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data;
        console.log(`SFDX (${operationType} - ${orgAlias}) stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        stderr += data;
        console.error(`SFDX (${operationType} - ${orgAlias}) stderr: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`SFDX (${operationType} - ${orgAlias}) process exited with code ${code}`);
        publishResultEvent(orgAlias, operationType, code, stdout, stderr, branchName);
    });

    child.on('error', (err) => {
        console.error(`Failed to start SFDX process: ${err}`);
        publishResultEvent(orgAlias, operationType, -1, '', err.message, branchName); // Use -1 for process start error
    });
}

function publishResultEvent(orgAlias, operationType, exitCode, stdout, stderr, branchName) {
    let eventApiName;
    let payload = {
        OrgAlias__c: orgAlias,
        ExitCode__c: exitCode,
        Output__c: stdout.substring(0, 131072), // Limit to Long Text Area max length (adjust if needed)
        Error__c: stderr.substring(0, 131072)
    };

    if (operationType === 'create') {
        eventApiName = 'ScratchOrgResultEvent__e';
        payload.OperationStatus__c = exitCode === 0 ? 'Success' : 'Failure';
    } else if (operationType === 'deploy') {
        eventApiName = 'DeployResultEvent__e';
        payload.BranchName__c = branchName;
        payload.OperationStatus__c = exitCode === 0 ? 'Success' : 'Failure';
    } else {
        console.error('Unknown operation type:', operationType);
        return;
    }

    conn.sobject(eventApiName).create(payload, (err, ret) => {
        if (err || !ret.success) {
            console.error('Error publishing result event:', err || ret.errors);
        } else {
            console.log('Result event published successfully:', ret);
        }
    });
}