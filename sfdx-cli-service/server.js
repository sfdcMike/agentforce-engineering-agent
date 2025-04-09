console.log('starting the server')
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

    // Subscribe to ScratchOrgRequestEvent
    const scratchOrgEventStream = conn.streaming.topic('/event/ScratchOrgRequestEvent__e').subscribe((message) => {
        console.log('Received ScratchOrgRequestEvent:', message.payload);
        const { orgAlias__c, definitionFilePath__c, durationDays__c } = message.payload;
        createScratchOrg(orgAlias__c, definitionFilePath__c, durationDays__c);
    });
    console.log('Subscribed to ScratchOrgRequestEvent__e');
});

function createScratchOrg(orgAlias, definitionFilePath, durationDays) {
    console.log(`Creating scratch org: Alias=${orgAlias}, Definition=${definitionFilePath}, Duration=${durationDays}`);
    const command = 'sfdx';
    const args = ['force:org:create', '-s', '-f', definitionFilePath, '-a', orgAlias, '-d', durationDays.toString()];

    executeSfdxCommand(command, args, orgAlias);
}

function executeSfdxCommand(command, args, orgAlias) {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data;
        console.log(`SFDX (create - ${orgAlias}) stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        stderr += data;
        console.error(`SFDX (create - ${orgAlias}) stderr: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`SFDX (create - ${orgAlias}) process exited with code ${code}`);
        publishScratchOrgResultEvent(orgAlias, code, stdout, stderr); // Publish the result event
    });

    child.on('error', (err) => {
        console.error(`Failed to start SFDX process: ${err}`);
        publishScratchOrgResultEvent(orgAlias, -1, '', err.message); // Publish an error event
    });
}

// Function to publish the ScratchOrgResultEvent__e platform event
function publishScratchOrgResultEvent(orgAlias, exitCode, stdout, stderr) {
    const eventPayload = {
        OrgAlias__c: orgAlias,
        OperationStatus__c: exitCode === 0 ? 'Success' : 'Failure', // 'Success' or 'Failure'
        Output__c: stdout.substring(0, 131072), // Truncate to fit Long Text Area if necessary
        Error__c: stderr.substring(0, 131072),
        ExitCode__c: exitCode
    };

    conn.sobject('ScratchOrgResultEvent__e').create(eventPayload, (err, ret) => {
        if (err || !ret.success) {
            console.error('Error publishing ScratchOrgResultEvent:', err || ret.errors);
        } else {
            console.log('ScratchOrgResultEvent published successfully:', ret);
        }
    });
}