<?php

namespace Database\Factories;

use App\Models\PreRepairMonitoring;
use App\Models\ItrPtrMonitoring;
use Illuminate\Database\Eloquent\Factories\Factory;

class PreRepairMonitoringFactory extends Factory
{
    protected $model = PreRepairMonitoring::class;

    public function definition(): array
    {
        $itrPtr = ItrPtrMonitoring::inRandomOrder()->first();

        return [
            'transaction_no' => $itrPtr?->transaction_no ?? 'ITR-' . $this->faker->unique()->numerify('#####'),
            'pre_repair_no' => 'PR-' . $this->faker->unique()->numerify('#####'),
            'from_accountable_officer' => $this->faker->name(),
            'to_accountable_officer' => $this->faker->name(),
            'property_no' => $itrPtr?->property_no ?? strtoupper($this->faker->bothify('PROP-###')),
            'description' => $this->faker->sentence(8),
            'amount' => $this->faker->randomFloat(2, 500, 25000),
            'condition_of_ppe' => $this->faker->randomElement(['Good', 'Fair', 'Damaged', 'Broken']),
            'location' => $this->faker->city(),
        ];
    }
}
