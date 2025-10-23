import { Body, Controller, Post } from '@nestjs/common'
import { PayloadAssemblyService } from './request-builder.service'

@Controller('request-builder')
export class RequestBuilderController {
  constructor(private service: PayloadAssemblyService) {}

  @Post('/test')
  public async _test(@Body() payload: any) {
    const schema = this.service.configureSchema({
      // $group: 'form-encoded',
      name: { alias: 'ik_name', $nest: 'extra' },
      country: { alias: 'ik_country', default: 'PL' },
      email: { alias: 'ik_email', required: false, $nest: 'extra' },
      phone: { alias: 'ik_phone', $nest: 'extra' },
      ip: { alias: 'ik_ip', required: false },
    })
    console.log(schema)
    const res = this.service.assemble(payload, schema)
    console.log(res)
    return res
  }
}
