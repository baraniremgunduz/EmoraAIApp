// Batch Operations - Toplu işlemler için optimizasyon utility
import { logger } from './logger';

export interface BatchOperationOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  continueOnError?: boolean;
}

/**
 * Toplu işlemler için batch processor
 */
export class BatchProcessor {
  /**
   * Array'i batch'lere böl ve işle
   */
  static async processInBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options: BatchOperationOptions = {}
  ): Promise<R[]> {
    const {
      batchSize = 50,
      delayBetweenBatches = 100,
      continueOnError = true,
    } = options;

    const results: R[] = [];
    const batches: T[][] = [];

    // Array'i batch'lere böl
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    logger.log(`Processing ${items.length} items in ${batches.length} batches`);

    // Her batch'i işle
    for (let i = 0; i < batches.length; i++) {
      try {
        const batchResults = await processor(batches[i]);
        results.push(...batchResults);

        // Son batch değilse bekle
        if (i < batches.length - 1 && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      } catch (error) {
        logger.error(`Batch ${i + 1} processing error:`, error);
        if (!continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Toplu insert işlemi
   */
  static async batchInsert<T>(
    items: T[],
    inserter: (batch: T[]) => Promise<void>,
    options: BatchOperationOptions = {}
  ): Promise<void> {
    await this.processInBatches(items, async (batch) => {
      await inserter(batch);
      return [];
    }, options);
  }

  /**
   * Toplu update işlemi
   */
  static async batchUpdate<T>(
    items: T[],
    updater: (batch: T[]) => Promise<void>,
    options: BatchOperationOptions = {}
  ): Promise<void> {
    await this.processInBatches(items, async (batch) => {
      await updater(batch);
      return [];
    }, options);
  }

  /**
   * Toplu delete işlemi
   */
  static async batchDelete(
    ids: string[],
    deleter: (batch: string[]) => Promise<void>,
    options: BatchOperationOptions = {}
  ): Promise<void> {
    await this.processInBatches(ids, async (batch) => {
      await deleter(batch);
      return [];
    }, options);
  }
}

