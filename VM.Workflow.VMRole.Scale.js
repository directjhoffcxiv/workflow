/// <disable>JS2076.IdentifierIsMiscased</disable>

(function(global, $, resources, constants, ajax, undefined) {
    "use strict";

    global.Shell.Namespace.define("VMExtension.Workflow.VMRole.Scale", {
            start: function(options) {
                var steps = [];

                if (typeof options.newInstanceCount === "number" && options.newInstanceCount >= 0) {
                    steps.push(this._scaleStep(options));
                }

                if (options.newVMSize) {
                    steps.push(this._resizeStep(options));
                }
                
                return global.ExpFx.Workflow.start(this._setupProgress(options), steps);
            },

            _setupProgress: function(options) {
                return {
                    initialText: resources.saveVMRoleScaleInitMessage.format(options.activeVMRole.displayName),
                    successText: resources.saveVMRoleScaleSuccessMessage.format(options.activeVMRole.displayName),
                    failureText: resources.saveVMRoleScaleFailureMessage.format(options.activeVMRole.displayName)
                };
            },

            _scaleStep: function(options) {

                var vmRoleId = options.vmRoleId,
                    subscriptionId = options.subscriptionId,
                    cloudService = options.cloudService,
                    newInstanceCount = options.newInstanceCount,
                    longRunningOperationOptions = options,
                    longRunningOperation = null;

                return {
                    start: function() {
                        var deferred = $.Deferred();

                        $.observable(options.activeVMRole).setProperty("isMutating", true);
                        global.Exp.Data.lockItem(options.activeVMRole);

                        ajax.scaleVMRole(vmRoleId, subscriptionId, cloudService, newInstanceCount, "")
                            .always(function() {
                                global.Exp.Data.unlockItem(options.activeVMRole);
                            })
                            .done(function(response) {
                                $.extend(longRunningOperationOptions, response);
                                longRunningOperationOptions.successStatuses = [constants.vmRoleStatus.Provisioned];
                                longRunningOperationOptions.isFailed = function(status) { return status === constants.vmRoleStatus.Failed; };

                                longRunningOperation = new global.VMCore.Workflow.VMRole.longRunningOperation(longRunningOperationOptions);
                                longRunningOperation.start()
                                    .done(function(pollingResult) {
                                        deferred.resolve(pollingResult);
                                    })
                                    .fail(function(pollingResult) {
                                        deferred.reject(pollingResult);
                                    });
                            })
                            .fail(function(response) {
                                global.VMExtension.Utilities.refreshVMRoleCache(subscriptionId, cloudService, vmRoleId)
                                    .done(function(dataSetName, vmRoleDataSet) {
                                        var errorMessages = global.VMCore.Utilities.getVMRoleErrorMessages(vmRoleDataSet.data);
                                        deferred.reject(errorMessages || response);
                                    })
                                    .fail(function() {
                                        deferred.reject(response);
                                    });
                            });

                        return deferred.promise();
                    },

                    initialText: resources.saveVMRoleScaleInitMessage.format(options.activeVMRole.displayName),
                    successText: resources.saveVMRoleScaleSuccessMessage.format(options.activeVMRole.displayName),
                    failureText: resources.saveVMRoleScaleFailureMessage.format(options.activeVMRole.displayName)
                };
            },

            _resizeStep: function(options) {

                var vmRoleId = options.vmRoleId,
                    subscriptionId = options.subscriptionId,
                    cloudService = options.cloudService,
                    longRunningOperationOptions = options,
                    longRunningOperation = null,
                    resourceConfig,
                    version,
                    parameterName,
                    newResourceConfig;

                resourceConfig = $.parseJSON(options.viewModel.vmRole.resourceConfigurationParameterValues);
                version = options.viewModel.vmRole.resourceConfigurationVersion;

                parameterName = global.VMExtension.VMRole.Utilities.findVMRoleParameterName(options.viewModel.vmRole.partialResourceDefinition, constants.vmRoleResourceDefinition.vmSize);

                if (parameterName) {
                    if (resourceConfig[parameterName] !== options.newVMSize) {
                        resourceConfig[parameterName] = options.newVMSize;

                        newResourceConfig = JSON.stringify({
                            ResourceConfiguration: {
                                Version: global.VMExtension.Utilities.increaseMinorVersion(version),
                                ParameterValues: JSON.stringify(resourceConfig)
                            }
                        });
                    }
                }

                return {
                    start: function() {
                        var deferred = $.Deferred();

                        $.observable(options.activeVMRole).setProperty("isMutating", true);
                        global.Exp.Data.lockItem(options.activeVMRole);

                        ajax.scaleVMRole(vmRoleId, subscriptionId, cloudService, null, newResourceConfig)
                            .always(function() {
                                global.Exp.Data.unlockItem(options.activeVMRole);
                            })
                            .done(function(response) {
                                $.extend(longRunningOperationOptions, response);
                                longRunningOperationOptions.successStatuses = [constants.vmRoleStatus.Provisioned];
                                longRunningOperationOptions.isFailed = function(status) { return status === constants.vmRoleStatus.Failed; };

                                longRunningOperation = new global.VMCore.Workflow.VMRole.longRunningOperation(longRunningOperationOptions);
                                longRunningOperation.start()
                                    .done(function(pollingResult) {
                                        deferred.resolve(pollingResult);
                                    })
                                    .fail(function(pollingResult) {
                                        deferred.reject(pollingResult);
                                    });
                            })
                            .fail(function(response) {
                                global.VMExtension.Utilities.refreshVMRoleCache(subscriptionId, cloudService, vmRoleId)
                                    .done(function(dataSetName, vmRoleDataSet) {
                                        var errorMessages = global.VMCore.Utilities.getVMRoleErrorMessages(vmRoleDataSet.data);
                                        deferred.reject(errorMessages || response);
                                    })
                                    .fail(function() {
                                        deferred.reject(response);
                                    });
                            });

                        return deferred.promise();
                    },

                    initialText: resources.updateVMRoleInitialMessage.format(options.activeVMRole.displayName),
                    successText: resources.updateVMRoleSuccessMessage.format(options.activeVMRole.displayName),
                    failureText: resources.updateVMRoleFailureMessage.format(options.activeVMRole.displayName)
                };
            }
        });

})(this, this.jQuery,
    this.VMExtension.Resources,
    this.VMExtension.Constants,
    this.VMCore.Model.Ajax);