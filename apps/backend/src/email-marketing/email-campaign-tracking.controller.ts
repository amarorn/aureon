import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailCampaignService } from './email-campaign.service';

@Controller('email-campaigns/track')
export class EmailCampaignTrackingController {
  constructor(private readonly campaignService: EmailCampaignService) {}

  @Get('open')
  async trackOpen(
    @Query('recipientId') recipientId: string,
    @Res() res: Response,
  ) {
    if (recipientId) {
      await this.campaignService.trackOpen(recipientId);
    }

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(this.campaignService.trackingPixel());
  }

  @Get('click')
  async trackClick(
    @Query('recipientId') recipientId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) {
      throw new BadRequestException('URL de tracking inválida');
    }

    const redirectUrl = await this.campaignService.trackClick(recipientId, url);
    return res.redirect(302, redirectUrl);
  }
}
