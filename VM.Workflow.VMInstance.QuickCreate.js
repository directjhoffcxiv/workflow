/// <disable>JS2076.IdentifierIsMiscased,JS2074.IdentifierNameIsMisspelled</disable>
(function(global, $, resources, ajax, repository, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMInstance.QuickCreate", {
        start: function(data) {
            var that = this,
                workflow = new global.Spf.Workflow.ExecuteAction(
                    function() {
                        return that._createVMInstanceStep(data);
                    },
                    function(requestResult) {
                        var refreshNetworkPromise = global.VMExtension.Utilities.expireNetworkByVMId(requestResult.virtualMachine.subscriptionId, requestResult.virtualMachine.id, true), // expire cache for network extension, so that user will always see latest update
                            vmListPromise = repository.startRefresh();

                        return $.when(refreshNetworkPromise, vmListPromise);
                    },
                    {
                        longRunningOperation: global.Exp.Spf.longRunningOperation
                    },
                    {
                        initMessage: resources.createVMInstanceInitialMessage.format(data.name),
                        successMessage: resources.createVMInstanceSuccessMessage.format(data.name),
                        failMessage: resources.createVMInstanceFailureMessage.format(data.name)
                    });

            workflow.start().always(function() {
                repository.startRefresh();
            });
        },

        _createVMInstanceStep: function(data) {
            var promise, deferred = $.Deferred();
            promise = ajax.quickCreateVMInstance(data);

            promise
                .done(function(result) {
                    global.VMExtension.Utilities.addVMPlaceholder(result.virtualMachine);
                    deferred.resolve(result);
                })
                .fail(function(result) {
                    deferred.reject(result);
                });

            return deferred.promise();
        }
    });

})(this, this.jQuery,
    this.VMExtension.Resources,
    this.VMExtension.Model.Ajax,
    this.VMExtension.Model.VM.Repository);