import { NodeData, EdgeData, AccusedProfile } from './types';

export const initialNodes: NodeData[] = [
  { id: 'ps1', type: 'police_station', label: 'PS Central', x: 500, y: 100 },
  { id: 'fir1', type: 'fir', label: 'FIR 0247', x: 350, y: 150 },
  { id: 'fir2', type: 'fir', label: 'FIR 0112', x: 800, y: 280 },
  { id: 'fir3', type: 'fir', label: 'FIR 0891', x: 550, y: 550 },
  { id: 'a1', type: 'accused', label: 'A1: Ramesh Kumar', subLabel: 'Risk: 0.84', x: 400, y: 300, risk: 'high', riskScore: 0.84 },
  { id: 'a2', type: 'accused', label: 'K. Rao', x: 600, y: 250, risk: 'med' },
  { id: 'a3', type: 'accused', label: 'S. Gupta', x: 700, y: 400, risk: 'med' },
  { id: 'a4', type: 'accused', label: 'V. Patil', x: 250, y: 450, risk: 'low' }
];

export const initialEdges: EdgeData[] = [
  { id: 'e1', source: 'a1', target: 'a2', type: 'co_accused' },
  { id: 'e2', source: 'a2', target: 'a3', type: 'co_accused' },
  { id: 'e3', source: 'a1', target: 'fir1', type: 'arrested_together' },
  { id: 'e4', source: 'a3', target: 'fir2', type: 'arrested_together' },
  { id: 'e5', source: 'a2', target: 'ps1', type: 'similar_mo' },
  { id: 'e6', source: 'a1', target: 'a4', type: 'similar_mo' },
  { id: 'e7', source: 'a3', target: 'fir3', type: 'similar_mo' }
];

export const profiles: Record<string, AccusedProfile> = {
  'a1': {
    id: 'a1',
    name: 'A1: Ramesh Kumar',
    masterId: 'ACC-BLR-8842',
    tags: ['Repeat Offender', 'Absconding'],
    riskScore: 0.84,
    shapFeatures: [
      { name: 'Prior offenses in same taluk', value: 0.34 },
      { name: '< 6 months since last offense', value: 0.28 },
      { name: 'Co-accused network density', value: 0.15 },
      { name: 'Age > 45', value: -0.08 }
    ],
    firs: [
      { id: '1 0443 0006 2026 00247', station: 'PS Central, Bangalore', date: '12-Oct-2023' },
      { id: '1 0443 0006 2026 00112', station: 'PS Central, Bangalore', date: '04-Jun-2023' },
      { id: '2 0891 0012 2022 00405', station: 'PS North, Hubli', date: '22-Jan-2022' }
    ]
  }
};
