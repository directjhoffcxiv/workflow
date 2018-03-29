/// <disable>JS2076.IdentifierIsMiscased</disable>
/// <dictionary>resdef</dictionary>

(function(global, $, resources, constants, repository, roleUtilities, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMRole.Update", {
        start: function(data, resourceDefinition) {
            var that = this,
                workflow = new global.Spf.Workflow.ExecuteAction(
                    function() {
                        return that._updateVMRoleStep(data, resourceDefinition);
                    },
                    function() {
                        $.observable(data).setProperty("isMutating", false);
                        global.VMExtension.Utilities.refreshVMRoleCache(data.subscriptionId, data.cloudService, data.roleName, { affectsUsageData: true });
                        return repository.startRefresh();
                    },
                    {
                        longRunningOperation: global.VMCore.Workflow.VMRole.longRunningOperation,
                        longRunningOperationParams: {
                            successStatuses: [constants.vmRoleStatus.Provisioned],
                            isFailed: function(status) { return status === constants.vmRoleStatus.Failed; }
                        }
                    },
                    {
                        initMessage: resources.updateVMRoleInitialMessage.format(data.roleName),
                        successMessage: resources.updateVMRoleSuccessMessage.format(data.roleName),
                        failMessage: resources.updateVMRoleFailureMessage.format(data.roleName)
                    }
                );

            workflow.start();
        },

        _updateVMRoleStep: function(data, resourceDefinition) {
            var promise, deferred = $.Deferred();
            promise = global.VMCore.Model.Ajax.reconfigureVMRole(data.subscriptionId, data.roleName, data.cloudService, this._prepareResourceConfiguration(data, resourceDefinition));
            $.observable(data).setProperty("isMutating", true);

            promise
               .done(function(response) {
                   global.VMExtension.Utilities.refreshVMRoleCache(data.subscriptionId, data.cloudService, data.roleName, { affectsUsageData: true });
                   deferred.resolve(response);
               })
               .fail(function(response) {
                    deferred.reject(response);
               });

            return deferred.promise();
        },

        _prepareResourceConfiguration: function(data, resourceDefinition) {
            var configuration = {
                Version: global.VMExtension.Utilities.increaseMinorVersion(data.resourceConfigurationVersion),
                ParameterValues: JSON.stringify(data.resourceConfigurationParameterValues)
            };

            if (resourceDefinition) {
                return {
                    ResourceDefinition: resourceDefinition,
                    ResourceConfiguration: configuration
                };
            } else {
                return {
                    ResourceConfiguration: configuration
                };
            }
        }
    });

})(this, this.jQuery,
    this.VMExtension.Resources,
    this.VMExtension.Constants,
    this.VMExtension.Model.VM.Repository,
    this.VMExtension.VMRole.Utilities);