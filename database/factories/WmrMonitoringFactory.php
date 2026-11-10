<?php

namespace Database\Factories;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\Supplier;
use App\Models\WmrMonitoring;
use Illuminate\Database\Eloquent\Factories\Factory;

class WmrMonitoringFactory extends Factory
{
    protected $model = WmrMonitoring::class;

    public function definition(): array
    {
        $wmrNo = $this->faker->unique()->numerify('2026######');

        return [
            'wmr_no' => $wmrNo,
            'wmr_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'supplier_id' => Supplier::query()->inRandomOrder()->value('supplier_id'),
            'iar_no' => $this->faker->optional()->numerify('IAR-2026-####'),
            'iar_date' => $this->faker->optional()->dateTimeBetween('-1 year', 'now'),
            'item_vehicle' => $this->faker->randomElement([
                'Motor vehicle',
                'Office equipment',
                'Computer equipment',
            ]),
            'job_order_no' => $this->faker->optional()->numerify('JO-2026-####'),
            'job_order_date' => $this->faker->optional()->dateTimeBetween('-1 year', 'now'),
            'fund_cluster_id' => FundCluster::query()->inRandomOrder()->value('fund_cluster_id'),
            'vehicle_type' => $this->faker->optional()->randomElement(['SUV', 'Sedan', 'Utility vehicle']),
            'brand_name' => $this->faker->optional()->randomElement(['Toyota', 'Mitsubishi', 'Honda']),
            'model' => $this->faker->optional()->bothify('Model ##'),
            'plate_no' => $this->faker->optional()->bothify('???-####'),
            'serial_engine_no' => $this->faker->optional()->bothify('ENG-########'),
            'acquisition_date' => (string) $this->faker->year(),
            'property_no' => $this->faker->optional()->bothify('PROP-####'),
            'inspector_name' => $this->faker->name(),
            'inspection_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'invoice_no' => $this->faker->optional()->numerify('INV-2026-####'),
            'invoice_date' => $this->faker->optional()->date('Y-m-d'),
            'labor_cost' => $this->faker->randomFloat(2, 500, 25000),
            'office_code' => Office::query()->inRandomOrder()->value('office_code'),
            'requested_by' => $this->faker->name(),
            'received_by' => $this->faker->name(),
            'received_date' => $this->faker->optional()->dateTimeBetween('-1 year', 'now'),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }
}
