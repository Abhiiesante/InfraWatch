import prisma from '@/lib/prisma.js';

export interface DatasetItem {
  id: string;
  text: string;
  label: string;
  numericalFeatures: number[];
  createdAt: Date;
}

export interface TrainTestSplitResult {
  trainSet: DatasetItem[];
  testSet: DatasetItem[];
  trainSize: number;
  testSize: number;
  splitRatio: number; // e.g. 0.8
}

export class MlDatasetService {
  /**
   * Extract feature dataset from live database records
   */
  static async extractIncidentDataset(tenantId: number): Promise<DatasetItem[]> {
    const incidents = await prisma.incident.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        createdAt: true,
      },
    });

    const dataset: DatasetItem[] = incidents.map((inc) => ({
      id: `inc-${inc.id}`,
      text: `${inc.title} ${inc.description || ''}`,
      label: inc.severity || 'MEDIUM',
      numericalFeatures: [inc.title.length, (inc.description || '').length],
      createdAt: inc.createdAt,
    }));

    // Seed dataset entries for robust model feature coverage
    const seedEntries: DatasetItem[] = [
      { id: 'seed-1', text: 'Electrical transformer explosion fire emergency hazard', label: 'CRITICAL', numericalFeatures: [50, 100], createdAt: new Date() },
      { id: 'seed-2', text: 'High voltage line short circuit power outage failure', label: 'CRITICAL', numericalFeatures: [45, 90], createdAt: new Date() },
      { id: 'seed-3', text: 'Catastrophic structural column crack gas leak danger', label: 'CRITICAL', numericalFeatures: [55, 110], createdAt: new Date() },
      { id: 'seed-4', text: 'Cooling tower pump temperature overheating HVAC disruption', label: 'HIGH', numericalFeatures: [52, 95], createdAt: new Date() },
      { id: 'seed-5', text: 'Water pipe burst basement flooding mechanical room', label: 'HIGH', numericalFeatures: [48, 88], createdAt: new Date() },
      { id: 'seed-6', text: 'SCADA telemetry grid sensor connection offline', label: 'HIGH', numericalFeatures: [46, 85], createdAt: new Date() },
      { id: 'seed-7', text: 'Drone cable inspection rust corrosion tension drop', label: 'HIGH', numericalFeatures: [50, 92], createdAt: new Date() },
      { id: 'seed-8', text: 'Routine minor rust on exterior security fence', label: 'LOW', numericalFeatures: [42, 75], createdAt: new Date() },
      { id: 'seed-9', text: 'Cosmetic paint peeling maintenance shed door lock', label: 'LOW', numericalFeatures: [44, 78], createdAt: new Date() },
      { id: 'seed-10', text: 'Scheduled light bulb replacement office hallway', label: 'LOW', numericalFeatures: [40, 70], createdAt: new Date() },
    ];

    return [...seedEntries, ...dataset];
  }

  /**
   * Split dataset into 80% Training Set and 20% Holdout Test Set (Stratified Sampling)
   */
  static splitTrainTest(dataset: DatasetItem[], trainRatio = 0.8): TrainTestSplitResult {
    const trainSet: DatasetItem[] = [];
    const testSet: DatasetItem[] = [];

    // Group items by label for stratified sampling across classes
    const groups: Record<string, DatasetItem[]> = {};
    dataset.forEach((item) => {
      if (!groups[item.label]) groups[item.label] = [];
      groups[item.label].push(item);
    });

    Object.keys(groups).forEach((label) => {
      const items = groups[label].sort((a, b) => a.id.localeCompare(b.id));
      const trainCut = Math.max(1, Math.floor(items.length * trainRatio));
      trainSet.push(...items.slice(0, trainCut));
      testSet.push(...items.slice(trainCut));
    });

    // Ensure testSet has at least 3 items if dataset is non-empty
    if (testSet.length < 3 && trainSet.length > 3) {
      const takeCount = 3 - testSet.length;
      testSet.push(...trainSet.splice(trainSet.length - takeCount, takeCount));
    }

    return {
      trainSet,
      testSet,
      trainSize: trainSet.length,
      testSize: testSet.length,
      splitRatio: trainRatio,
    };
  }
}
