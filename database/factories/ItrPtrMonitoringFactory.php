<?php

namespace Database\Factories;

use App\Models\ItrPtrMonitoring;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItrPtrMonitoringFactory extends Factory
{
    protected $model = ItrPtrMonitoring::class;

    public function definition(): array
    {
        return [
            'transaction_no' => 'ITR-' . $this->faker->unique()->numerify('#####'),
            'date_release' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'claimed_by' => $this->faker->name(),
            'from_accountable_officer' => $this->faker->name(),
            'to_accountable_officer' => $this->faker->name(),
            'property_no' => strtoupper($this->faker->bothify('PROP-###')),
            'description' => $this->faker->sentence(8),
            'amount' => $this->faker->randomFloat(2, 1000, 50000),
            'condition_of_ppe' => $this->faker->randomElement(['Good', 'Fair', 'Damaged', 'Broken']),
            'location' => $this->faker->city(),
            'date_received' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
