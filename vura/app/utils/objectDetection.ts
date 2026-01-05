import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  class: string;
  score: number;
  bbox: Box;
}

// Singleton to hold the model
let model: cocoSsd.ObjectDetection | null = null;
let isLoading = false;

export const ObjectDetection = {
  /**
   * Loads the COCO-SSD model if not already loaded.
   */
  loadModel: async (): Promise<void> => {
    if (model || isLoading) return;
    isLoading = true;
    try {
      await tf.ready();
      model = await cocoSsd.load();
      console.log('COCO-SSD Model Loaded');
    } catch (err) {
      console.error('Failed to load COCO-SSD model', err);
    } finally {
      isLoading = false;
    }
  },

  /**
   * Detects objects in the provided image element.
   * Returns a simplified list of DetectedObject.
   */
  detect: async (imageElement: HTMLImageElement | HTMLVideoElement): Promise<DetectedObject[]> => {
    if (!model) {
      await ObjectDetection.loadModel();
    }
    
    if (!model) return [];
    
    const predictions = await model.detect(imageElement);
    
    return predictions.map(pred => ({
      class: pred.class,
      score: pred.score,
      bbox: {
        x: pred.bbox[0],
        y: pred.bbox[1],
        width: pred.bbox[2],
        height: pred.bbox[3]
      }
    }));
  }
};
