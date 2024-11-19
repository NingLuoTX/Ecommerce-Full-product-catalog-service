import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly productCreationCounter: Counter;
  // private readonly loginAttemptCounter: Counter;

  constructor() {
    this.registry = new Registry();

    this.productCreationCounter = new Counter({
      name: 'product_creations_total',
      help: 'Total number of product creations',
    });

    // this.loginAttemptCounter = new Counter({
    //   name: 'login_attempts_total',
    //   help: 'Total number of login attempts',
    //   labelNames: ['status'],
    // });

    this.registry.registerMetric(this.productCreationCounter);
    // this.registry.registerMetric(this.loginAttemptCounter);
  }

  incrementProductCreation() {
    this.productCreationCounter.inc();
  }

  // incrementLoginAttempt(status: 'success' | 'failure') {
  //   this.loginAttemptCounter.labels(status).inc();
  // }

  getMetrics() {
    return this.registry.metrics();
  }
}
