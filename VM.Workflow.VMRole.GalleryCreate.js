/// <disable>JS2076.IdentifierIsMiscased</disable>
/// <dictionary>resdef</dictionary>

(function(global, $, resources, constants, repository, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMRole.GalleryCreate", {
        start: function(roleData, resourceDefinition) {
            var that = this,
                workflow = new global.Spf.Workflow.ExecuteAction(
                    function() {
                        return that._createVMRoleStep(roleData, resourceDefinition);
                    },
                    function(requestResult) {
                        var vmNetworkRefreshDeferred = $.Deferred(),
                            vmListPromise = repository.startRefresh();

                        global.VMExtension.Utilities.refreshVMRoleCache(roleData.subscriptionId, roleData.roleName, roleData.roleName, { affectsUsageData: true }).done(function() {
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
                        initMessage: resources.createVMRoleInitialMessage.format(roleData.roleName),
                        successMessage: resources.createVMRoleSuccessMessage.format(roleData.roleName),
                        failMessage: resources.createVMRoleFailureMessage.format(roleData.roleName)
                    }
                );

            workflow.start();
        },

        _createVMRoleStep: function(data, resourceDefinition) {
            var promise, deferred = $.Deferred();
            promise = global.VMCore.Model.Ajax.quickCreateVMRole(data.subscriptionId, this._prepareVMRole(data, resourceDefinition));

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

        _prepareVMRole: function(data, resdef) {
            return {
                Name: data.roleName,
                Label: data.roleName,
                ResourceDefinition: resdef,
                ResourceConfiguration: {
                    Version: "1.0.0.0",
                    ParameterValues: JSON.stringify(data.parameterValues)
                }
            };
        }
    });

})(this, this.jQuery,
    this.VMExtension.Resources,
    this.VMExtension.Constants,
    this.VMExtension.Model.VM.Repository);