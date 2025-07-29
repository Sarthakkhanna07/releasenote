export interface ValidationResult {
    isValid: boolean
    errors: ValidationError[]
    warnings: ValidationWarning[]
}

export interface ValidationError {
    field: string
    message: string
    code: string
}

export interface ValidationWarning {
    field: string
    message: string
    code: string
}

export class ValidationService {
    
    static validateRepositorySelection(repository: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (!repository) {
            errors.push({
                field: 'repository',
                message: 'Repository selection is required',
                code: 'REPOSITORY_REQUIRED'
            })
        } else {
            if (!repository.id) {
                errors.push({
                    field: 'repository.id',
                    message: 'Repository ID is missing',
                    code: 'REPOSITORY_ID_MISSING'
                })
            }

            if (!repository.full_name) {
                errors.push({
                    field: 'repository.full_name',
                    message: 'Repository full name is missing',
                    code: 'REPOSITORY_NAME_MISSING'
                })
            }

            if (!repository.provider) {
                errors.push({
                    field: 'repository.provider',
                    message: 'Repository provider is missing',
                    code: 'REPOSITORY_PROVIDER_MISSING'
                })
            } else if (!['github', 'gitlab', 'bitbucket'].includes(repository.provider)) {
                errors.push({
                    field: 'repository.provider',
                    message: 'Invalid repository provider',
                    code: 'REPOSITORY_PROVIDER_INVALID'
                })
            }

            // Warnings
            if (repository.private) {
                warnings.push({
                    field: 'repository.private',
                    message: 'Private repository selected - ensure you have proper access',
                    code: 'REPOSITORY_PRIVATE'
                })
            }

            if (!repository.description) {
                warnings.push({
                    field: 'repository.description',
                    message: 'Repository has no description - this may affect AI generation quality',
                    code: 'REPOSITORY_NO_DESCRIPTION'
                })
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static validateDataSourceOptions(options: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (!options) {
            errors.push({
                field: 'dataSources',
                message: 'Data source options are required',
                code: 'DATA_SOURCES_REQUIRED'
            })
            return { isValid: false, errors, warnings }
        }

        // At least one data source must be selected
        if (!options.commits && !options.issues) {
            errors.push({
                field: 'dataSources',
                message: 'At least one data source (commits or issues) must be selected',
                code: 'NO_DATA_SOURCES_SELECTED'
            })
        }

        // Date range validation
        if (!options.dateRange) {
            errors.push({
                field: 'dataSources.dateRange',
                message: 'Date range is required',
                code: 'DATE_RANGE_REQUIRED'
            })
        } else {
            if (!options.dateRange.from) {
                errors.push({
                    field: 'dataSources.dateRange.from',
                    message: 'Start date is required',
                    code: 'START_DATE_REQUIRED'
                })
            }

            if (!options.dateRange.to) {
                errors.push({
                    field: 'dataSources.dateRange.to',
                    message: 'End date is required',
                    code: 'END_DATE_REQUIRED'
                })
            }

            if (options.dateRange.from && options.dateRange.to) {
                const fromDate = new Date(options.dateRange.from)
                const toDate = new Date(options.dateRange.to)
                const now = new Date()

                if (fromDate > toDate) {
                    errors.push({
                        field: 'dataSources.dateRange',
                        message: 'Start date must be before end date',
                        code: 'INVALID_DATE_RANGE'
                    })
                }

                if (toDate > now) {
                    warnings.push({
                        field: 'dataSources.dateRange.to',
                        message: 'End date is in the future',
                        code: 'FUTURE_END_DATE'
                    })
                }

                // Check if date range is too large (more than 1 year)
                const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
                if (daysDiff > 365) {
                    warnings.push({
                        field: 'dataSources.dateRange',
                        message: 'Date range is very large (>1 year) - this may affect performance',
                        code: 'LARGE_DATE_RANGE'
                    })
                }

                // Check if date range is too small (less than 1 day)
                if (daysDiff < 1) {
                    warnings.push({
                        field: 'dataSources.dateRange',
                        message: 'Date range is very small (<1 day) - you may not get enough data',
                        code: 'SMALL_DATE_RANGE'
                    })
                }
            }
        }

        // Branch validation
        if (options.branch && typeof options.branch !== 'string') {
            errors.push({
                field: 'dataSources.branch',
                message: 'Branch name must be a string',
                code: 'INVALID_BRANCH_TYPE'
            })
        }

        if (options.branch && options.branch.length > 100) {
            errors.push({
                field: 'dataSources.branch',
                message: 'Branch name is too long',
                code: 'BRANCH_NAME_TOO_LONG'
            })
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static validateTemplateSelection(template: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (!template) {
            errors.push({
                field: 'template',
                message: 'Template selection is required',
                code: 'TEMPLATE_REQUIRED'
            })
            return { isValid: false, errors, warnings }
        }

        if (template === 'ai-decide') {
            // AI decide is always valid
            return { isValid: true, errors, warnings }
        }

        if (typeof template === 'object') {
            if (!template.id) {
                errors.push({
                    field: 'template.id',
                    message: 'Template ID is missing',
                    code: 'TEMPLATE_ID_MISSING'
                })
            }

            if (!template.name) {
                errors.push({
                    field: 'template.name',
                    message: 'Template name is missing',
                    code: 'TEMPLATE_NAME_MISSING'
                })
            }

            if (!template.system_prompt) {
                errors.push({
                    field: 'template.system_prompt',
                    message: 'Template system prompt is missing',
                    code: 'TEMPLATE_SYSTEM_PROMPT_MISSING'
                })
            }

            if (!template.user_prompt_template) {
                errors.push({
                    field: 'template.user_prompt_template',
                    message: 'Template user prompt is missing',
                    code: 'TEMPLATE_USER_PROMPT_MISSING'
                })
            }

            // Validate template fields
            const validCategories = ['traditional', 'modern', 'technical', 'marketing', 'changelog', 'minimal']
            if (template.category && !validCategories.includes(template.category)) {
                errors.push({
                    field: 'template.category',
                    message: 'Invalid template category',
                    code: 'TEMPLATE_INVALID_CATEGORY'
                })
            }

            const validTones = ['professional', 'casual', 'technical', 'enthusiastic', 'formal']
            if (template.tone && !validTones.includes(template.tone)) {
                errors.push({
                    field: 'template.tone',
                    message: 'Invalid template tone',
                    code: 'TEMPLATE_INVALID_TONE'
                })
            }

            const validAudiences = ['developers', 'business', 'users', 'mixed']
            if (template.target_audience && !validAudiences.includes(template.target_audience)) {
                errors.push({
                    field: 'template.target_audience',
                    message: 'Invalid template target audience',
                    code: 'TEMPLATE_INVALID_AUDIENCE'
                })
            }

            // Warnings
            if (!template.uses_org_ai_context) {
                warnings.push({
                    field: 'template.uses_org_ai_context',
                    message: 'Template does not use organization AI context - results may be less personalized',
                    code: 'TEMPLATE_NO_ORG_CONTEXT'
                })
            }
        } else {
            errors.push({
                field: 'template',
                message: 'Invalid template format',
                code: 'TEMPLATE_INVALID_FORMAT'
            })
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static validateAdditionalInstructions(data: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        // Version validation
        if (data.version) {
            if (typeof data.version !== 'string') {
                errors.push({
                    field: 'version',
                    message: 'Version must be a string',
                    code: 'VERSION_INVALID_TYPE'
                })
            } else {
                if (data.version.length > 50) {
                    errors.push({
                        field: 'version',
                        message: 'Version string is too long (max 50 characters)',
                        code: 'VERSION_TOO_LONG'
                    })
                }

                // Check for common version patterns
                const versionPattern = /^v?\d+(\.\d+)*(-[a-zA-Z0-9]+)?$/
                if (!versionPattern.test(data.version)) {
                    warnings.push({
                        field: 'version',
                        message: 'Version format may not follow semantic versioning (e.g., v1.0.0)',
                        code: 'VERSION_FORMAT_WARNING'
                    })
                }
            }
        }

        // Release date validation
        if (data.releaseDate) {
            const releaseDate = new Date(data.releaseDate)
            const now = new Date()

            if (isNaN(releaseDate.getTime())) {
                errors.push({
                    field: 'releaseDate',
                    message: 'Invalid release date format',
                    code: 'RELEASE_DATE_INVALID'
                })
            } else {
                // Check if release date is too far in the past (more than 1 year)
                const daysDiff = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
                if (daysDiff > 365) {
                    warnings.push({
                        field: 'releaseDate',
                        message: 'Release date is more than 1 year in the past',
                        code: 'RELEASE_DATE_OLD'
                    })
                }

                // Check if release date is too far in the future (more than 1 year)
                if (daysDiff < -365) {
                    warnings.push({
                        field: 'releaseDate',
                        message: 'Release date is more than 1 year in the future',
                        code: 'RELEASE_DATE_FAR_FUTURE'
                    })
                }
            }
        }

        // Instructions validation
        if (data.instructions) {
            if (typeof data.instructions !== 'string') {
                errors.push({
                    field: 'instructions',
                    message: 'Instructions must be a string',
                    code: 'INSTRUCTIONS_INVALID_TYPE'
                })
            } else {
                if (data.instructions.length > 1000) {
                    errors.push({
                        field: 'instructions',
                        message: 'Instructions are too long (max 1000 characters)',
                        code: 'INSTRUCTIONS_TOO_LONG'
                    })
                }

                if (data.instructions.length < 10) {
                    warnings.push({
                        field: 'instructions',
                        message: 'Instructions are very short - consider adding more detail',
                        code: 'INSTRUCTIONS_TOO_SHORT'
                    })
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static validateCompleteWizardData(wizardData: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        // Validate each step
        const repositoryValidation = this.validateRepositorySelection(wizardData.repository)
        const dataSourceValidation = this.validateDataSourceOptions(wizardData.dataSources)
        const templateValidation = this.validateTemplateSelection(wizardData.template)
        const instructionsValidation = this.validateAdditionalInstructions({
            version: wizardData.version,
            releaseDate: wizardData.releaseDate,
            instructions: wizardData.instructions
        })

        // Combine all validation results
        errors.push(...repositoryValidation.errors)
        errors.push(...dataSourceValidation.errors)
        errors.push(...templateValidation.errors)
        errors.push(...instructionsValidation.errors)

        warnings.push(...repositoryValidation.warnings)
        warnings.push(...dataSourceValidation.warnings)
        warnings.push(...templateValidation.warnings)
        warnings.push(...instructionsValidation.warnings)

        // Cross-field validations
        if (wizardData.repository && wizardData.dataSources) {
            // Check if selected data sources make sense for the repository
            if (wizardData.repository.provider === 'gitlab' && wizardData.dataSources.includePullRequests) {
                warnings.push({
                    field: 'dataSources.includePullRequests',
                    message: 'GitLab uses merge requests instead of pull requests',
                    code: 'GITLAB_PULL_REQUESTS_WARNING'
                })
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static validateGenerationRequest(request: any): ValidationResult {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (!request) {
            errors.push({
                field: 'request',
                message: 'Generation request is required',
                code: 'REQUEST_REQUIRED'
            })
            return { isValid: false, errors, warnings }
        }

        // Validate required fields
        if (!request.repository) {
            errors.push({
                field: 'repository',
                message: 'Repository is required for generation',
                code: 'REPOSITORY_REQUIRED'
            })
        }

        if (!request.dataSources) {
            errors.push({
                field: 'dataSources',
                message: 'Data sources are required for generation',
                code: 'DATA_SOURCES_REQUIRED'
            })
        }

        if (!request.template) {
            errors.push({
                field: 'template',
                message: 'Template selection is required for generation',
                code: 'TEMPLATE_REQUIRED'
            })
        }

        // Validate data completeness
        if (request.dataSources && !request.dataSources.commits && !request.dataSources.issues) {
            errors.push({
                field: 'dataSources',
                message: 'At least one data source must be enabled',
                code: 'NO_DATA_SOURCES_ENABLED'
            })
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    static formatValidationErrors(errors: ValidationError[]): string {
        if (errors.length === 0) return ''
        
        if (errors.length === 1) {
            return errors[0].message
        }

        return `Multiple validation errors:\n${errors.map(e => `• ${e.message}`).join('\n')}`
    }

    static formatValidationWarnings(warnings: ValidationWarning[]): string {
        if (warnings.length === 0) return ''
        
        if (warnings.length === 1) {
            return warnings[0].message
        }

        return `Warnings:\n${warnings.map(w => `• ${w.message}`).join('\n')}`
    }
}