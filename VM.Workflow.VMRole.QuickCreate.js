/// <disable>JS2076.IdentifierIsMiscased</disable>
/// <dictionary>resdef</dictionary>

(function(global, $, resources, constants, repository, roleUtilities, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMRole.QuickCreate", {
        start: function(data) {
            var that = this,
                workflow = new global.Spf.Workflow.ExecuteAction(
                    function() {
                        return that._createVMRoleStep(data);
                    },
                    function(requestResult) {
                        var vmNetworkRefreshDeferred = $.Deferred(),
                            vmListPromise = repository.startRefresh();

                        global.VMExtension.Utilities.refreshVMRoleCache(data.subscriptionId, data.roleName, data.roleName, { affectsUsageData: true }).done(function() {
                            // expire cache for network extension, so that user will always see latest update
                            global.VMExtension.Utilities.expireNetworkByVMRoleId(requestResult.subscriptionId, requestResult.cloudService, requestResult.vmRoleName)
                                .always(function() {
                                    vmNetworkRefreshDeferred.resolve();
                                });
                        }).fail(function() {
                            vmNetworkRefreshDeferred.resolve();
                        });

                        return $.when(vmNetworkRefreshDeferred, vmListPromise);
                    },
                    {
                        longRunningOperation: global.VMCore.Workflow.VMRole.longRunningOperation,
                        longRunningOperationParams: {
                            successStatuses: [constants.vmRoleStatus.Provisioned],
                            isFailed: function(status) { return status === constants.vmRoleStatus.Failed; }
                        }
                    },
                    {
                        initMessage: resources.createVMRoleInitialMessage.format(data.roleName),
                        successMessage: resources.createVMRoleSuccessMessage.format(data.roleName),
                        failMessage: resources.createVMRoleFailureMessage.format(data.roleName)
                    }
                );

            workflow.start()
                .fail(function() {
                    repository.startRefresh();
                });
        },

        _createVMRoleStep: function(data) {
            var promise, deferred = $.Deferred();
            promise = global.VMCore.Model.Ajax.quickCreateVMRole(data.subscriptionId, this._prepareVMRoleBasicResourceDefinition(data));

            promise
                .done(function(result) {
                    global.VMExtension.Utilities.addVMPlaceholder(result.vmRole);
                    deferred.resolve(result);
                })
                .fail(function(result) {
                    deferred.reject(result);
                });

            return deferred.promise();
        },

        _prepareVMRoleBasicResourceDefinition: function(data) {
            var resourceDefinition = roleUtilities.getQuickCreateResourceDefinition(data),
                resourceConfig = roleUtilities.getQuickCreateResourceConfiguration(data);

            return {
                Name: data.roleName,
                Label: data.roleName,
                ResourceDefinition: resourceDefinition,
                ResourceConfiguration: resourceConfig
            };
        }
    });

})(this, this.jQuery,
    this.VMExtension.Resources,
    this.VMExtension.Constants,
    this.VMExtension.Model.VM.Repository,
    this.VMExtension.VMRole.Utilities);