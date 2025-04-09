public class ScratchOrgCreator {

    @InvocableMethod(label='Create Scratch Org' description='Creates a Salesforce scratch org.')
    public static List<String> createScratchOrg(List<ScratchOrgInput> inputs) {
        ScratchOrgRequestEvent__e event = new ScratchOrgRequestEvent__e();
        event.orgAlias__c = inputs[0].orgAlias;
        event.definitionFilePath__c = inputs[0].definitionFilePath;
        event.durationDays__c = inputs[0].durationDays;

        List<Database.SaveResult> results = EventBus.publish(new List<ScratchOrgRequestEvent__e>{event});
        if (!results[0].isSuccess()) {
            System.debug('Failed to publish event: ' + results[0].getErrors());
            return new List<String>{'Failed to publish event: ' + results[0].getErrors()[0].getMessage()};
        } else {
            return new List<String>{'Event published successfully'};
        }
    }

    public class ScratchOrgInput {
        @InvocableVariable(required=true)
        public String orgAlias;

        @InvocableVariable(required=true)
        public String definitionFilePath;

        @InvocableVariable(required=true)
        public Integer durationDays;
    }
}