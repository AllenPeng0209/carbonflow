declare module 'convert-units' {
  type Unit = string; // Simplified type, actual library has specific unit types
  type Measure =
    | 'length'
    | 'mass'
    | 'volume'
    | 'temperature'
    | 'time'
    | 'frequency'
    | 'speed'
    | 'pace'
    | 'pressure'
    | 'digital'
    | 'partsPer'
    | 'voltage'
    | 'current'
    | 'power'
    | 'reactivePower'
    | 'apparentPower'
    | 'energy'
    | 'reactiveEnergy'
    | 'angle'
    | 'area'
    | 'illuminance';

  interface Convert {
    (value: number): {
      from: (fromUnit: Unit) => {
        to: (toUnit: Unit) => number;
      };
    };
    measures: () => Measure[];
    possibilities: (measure?: Measure) => Unit[];
    describe: (unit: Unit) => {
      abbr: Unit;
      measure: Measure;
      system: string;
      singular: string;
      plural: string;
    };
  }

  const convert: Convert;
  export = convert;
}
