import { BadRequestException, Injectable } from '@nestjs/common'

export type SchemaConfig = {
  $group: 'json' | 'form-data' | 'form-encoded' | 'query-sring'
}
export type SchemaConfigField = {
  default: string
  required: boolean
  alias: string
  mask: Record<string, any>
  $nest: string
}

export const schemaFieldConfigExample: SchemaConfigField = {
  default: 'default',
  required: true,
  alias: 'alias',
  mask: {},
  $nest: '$nest',
}

type PayloadBuildSchema = Record<string, Partial<SchemaConfigField>> | SchemaConfig
type PayloadSchema = Record<string, SchemaConfigField> | SchemaConfig

@Injectable()
export class PayloadAssemblyService {
  public configureSchema(schema: Partial<PayloadBuildSchema>) {
    const data = {}
    for (const key of Object.keys(schema)) {
      if (typeof schema[key] === 'object') {
        data[key] = this.validateSchemaConfigField(key, schema[key])
      } else {
        data[key] = schema[key]
      }
    }
    return data as PayloadSchema
  }

  public assemble(incomingBody: Record<string, string | number>, schema: PayloadSchema) {
    const data = {}
    const errors = {}
    if (schema?.$group === undefined) schema.$group = 'json'
    const isNested = schema.$group === 'json'
    for (const key of Object.keys(schema)) {
      const config: SchemaConfigField = schema[key]
      const value = incomingBody[key] ? incomingBody[key] : config?.default
      this.handleNecessaryField(value, key, config, errors)
      if (config?.mask && config.mask[value]) {
        this.compileData(data, config.mask[value], config, isNested)
      } else {
        this.compileData(data, value, config, isNested)
      }
    }
    this.throw400IfException(errors)
    if (schema.$group === 'form-data') return this.convertToFormData(data)
    if (schema.$group === 'form-encoded') return this.convertToFormUrlEncoded(data)
    if (schema.$group === 'query-sring') return this.convertToQueryString(data)
    return data
  }

  private validateSchemaConfigField(key: string, field: Partial<SchemaConfigField>) {
    for (const config of Object.keys(field)) {
      const isExist = schemaFieldConfigExample[config]
      !isExist && delete field[config]
    }
    if (field?.alias === undefined) field.alias = key
    if (field?.required === undefined) field.required = true
    return field
  }

  private compileData(data: object, initialValue: any, config: SchemaConfigField, isNested: boolean) {
    const { $nest, alias } = config
    if ($nest && isNested) {
      const nestKeys = $nest.split('.')
      const nestedData = this.createNestedObject(nestKeys, { [alias]: initialValue })
      this.mergeNestedObject(data, nestedData)
    } else {
      data[alias] = initialValue
    }
    return data
  }

  private handleNecessaryField(value: any, key: string, config: SchemaConfigField, errorScope: object) {
    if (config.required && value === undefined) {
      errorScope[key] = 'Field is required!'
    }
  }

  private throw400IfException(details: any) {
    if (Object.keys(details).length) {
      throw new BadRequestException({ success: false, details })
    }
  }

  private convertToFormData(data: object) {
    const form = new FormData()
    for (const key of Object.keys(data)) {
      if (!data[key]) continue
      form.append(key, data[key])
    }
    return form
  }

  private convertToFormUrlEncoded(data: object) {
    const form = new URLSearchParams()
    for (const key of Object.keys(data)) {
      if (!data[key]) continue
      form.append(key, data[key])
    }
    return form
  }

  private convertToQueryString(data: object) {
    let result = ''
    for (const key of Object.keys(data)) {
      if (!data[key]) continue
      const value = `${key}=${data[key]}`
      if (result) {
        result += '&' + value
      } else {
        result += value
      }
    }
    return result
  }

  private createNestedObject(keys: string[], value: any) {
    return keys.reduceRight((acc, key) => ({ [key]: acc }), value)
  }

  private mergeNestedObject(primary: object, secondary: object) {
    for (const key in secondary) {
      if (secondary.hasOwnProperty(key)) {
        if (
          typeof secondary[key] === 'object' &&
          !Array.isArray(secondary[key]) &&
          primary[key] !== undefined
        ) {
          primary[key] = this.mergeNestedObject(primary[key], secondary[key])
        } else if (Array.isArray(secondary[key]) && Array.isArray(primary[key])) {
          primary[key] = [...primary[key], ...secondary[key]]
        } else if (primary[key] === undefined) {
          primary[key] = secondary[key]
        }
      }
    }
    return primary
  }
}
