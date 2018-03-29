/// <disable>JS2076.IdentifierIsMiscased,JS2074.IdentifierNameIsMisspelled</disable>
(function(global, $, resources, constants, ajax, repository, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMInstance.GalleryCreate", {
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
            var promise,
                i,
                networks = [],
                deferred = $.Deferred();

            for (i = 0 ; i < data.network.length ; i++) {
                // "-" means "not connected" adapter
                networks.push(data.network[i].virtualNetworkName === "-" ? null : data.network[i].virtualNetworkName);
            }

            if (data.source && data.source.type === constants.types.templateType) {
                promise = ajax.createVMInstanceFromTemplate({
                    subscriptionId: data.subscriptionId,
                    templateId: data.source.id,
                    osType: data.osType,
                    name: data.name,
                    adminAccount: data.adminAccount,
                    password: data.password,
                    productKey: data.productKey,
                    sshKey: data.sshKey,
                    networks: networks
                });
            } else if (data.source && data.source.type === constants.types.diskType) {
                promise = ajax.createVMInstanceFromDisk({
                    subscriptionId: data.subscriptionId,
                    diskId: data.source.id,
                    name: data.name,
                    hardwareProfile: data.hardwareProfile,
                    networks: networks
                });
            }

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
    this.VMExtension.Constants,
    this.VMExtension.Model.Ajax,
    this.VMExtension.Model.VM.Repository);