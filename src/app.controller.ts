import { Controller, Get, Redirect } from '@nestjs/common';
import { AllowUnauthorizedRequest } from './auth/decorators';

@Controller()
export class AppController {
  @AllowUnauthorizedRequest()
  @Get()
  @Redirect('/api')
  index() {}
}
