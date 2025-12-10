import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('api/alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alertsService: AlertsService) {}

  @Post('watchlist')
  async addToWatchlist(
    @Body() payload: { userId: string; productId: number; targetPrice?: number; targetPercent?: number }
  ) {
    this.logger.log(`Adding Product ${payload.productId} to watchlist for user ${payload.userId}`);
    return this.alertsService.addToWatchlist(
      payload.userId,
      payload.productId,
      payload.targetPrice,
      payload.targetPercent
    );
  }

  @Delete('watchlist/:userId/:productId')
  async removeFromWatchlist(
    @Param('userId') userId: string,
    @Param('productId') productId: number
  ) {
    this.logger.log(`Removing Product ${productId} from watchlist for user ${userId}`);
    await this.alertsService.removeFromWatchlist(userId, productId);
    return { success: true };
  }

  @Get('watchlist/:userId')
  async getWatchlist(@Param('userId') userId: string) {
    return this.alertsService.getWatchlist(userId);
  }

  @Get(':userId')
  async getUserAlerts(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string
  ) {
    const unread = unreadOnly === 'true';
    return this.alertsService.getUserAlerts(userId, unread);
  }

  @Post(':alertId/read')
  async markAsRead(
    @Param('alertId') alertId: number,
    @Body() payload: { userId: string }
  ) {
    await this.alertsService.markAlertAsRead(alertId, payload.userId);
    return { success: true };
  }

  @Post(':alertId/dismiss')
  async dismissAlert(
    @Param('alertId') alertId: number,
    @Body() payload: { userId: string }
  ) {
    await this.alertsService.dismissAlert(alertId, payload.userId);
    return { success: true };
  }

  @Get(':userId/stats')
  async getAlertStats(@Param('userId') userId: string) {
    return this.alertsService.getAlertStats(userId);
  }
}

