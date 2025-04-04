public class BranchDeployer {

    @InvocableMethod(label='Deploy Branch to Scratch Org' description='Deploys a branch to a specified scratch org.')
    public static List<String> deployBranchToScratchOrg(List<DeployInput> inputs) {
        BranchDeployRequestEvent__e event = new BranchDeployRequestEvent__e();
        event.orgAlias__c = inputs[0].orgAlias;
        event.branchName__c = inputs[0].branchName;

        List<Database.SaveResult> results = EventBus.publish(new List<BranchDeployRequestEvent__e>{event});
        if (!results[0].isSuccess()) {
            System.debug('Failed to publish event: ' + results[0].getErrors());
            return new List<String>{'Failed to publish event: ' + results[0].getErrors()[0].getMessage()};
        } else {
            return new List<String>{'Event published successfully'};
        }
    }

    public class DeployInput {
        @InvocableVariable(required=true)
        public String orgAlias;

        @InvocableVariable(required=true)
        public String branchName;
    }
}