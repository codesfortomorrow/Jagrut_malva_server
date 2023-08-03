import { Job } from 'bullmq';
import { SentMessageInfo } from 'nodemailer/lib/smtp-transport';
import { Inject, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  OnQueueEvent,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { mailQueueConfigFactory } from '@Config';
import { MAIL_QUEUE } from '../common.constants';
import { MailService, SendMessagePayload } from '../providers';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    @Inject(mailQueueConfigFactory.KEY)
    private readonly config: ConfigType<typeof mailQueueConfigFactory>,
    private readonly mailService: MailService,
  ) {
    super();
  }

  onModuleInit() {
    this.worker.concurrency = this.config.concurrency;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close();
  }

  @OnWorkerEvent('error')
  onWorkerError(err: Error): void {
    console.error('Mail worker error:', err);
  }

  @OnQueueEvent('error')
  onQueueError(err: Error): void {
    console.error('Mail queue error:', err);
  }

  async process(
    job: Job<SendMessagePayload, SentMessageInfo, string>,
  ): Promise<SentMessageInfo> {
    const { to, subject, attachments, replyTo } = job.data;
    let { mailBody } = job.data;

    if (typeof mailBody !== 'string') {
      mailBody = await this.mailService.renderTemplate(
        mailBody.template,
        mailBody.data,
      );
    }

    const mailOptions = this.mailService.configureMessage(
      to,
      subject,
      mailBody,
      attachments,
      replyTo,
    );
    return await this.mailService.transporter.sendMail(mailOptions);
  }
}
