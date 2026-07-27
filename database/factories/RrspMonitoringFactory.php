<?php

namespace Database\Factories;

use App\Models\RrspMonitoring;
use App\Models\Office;
use Illuminate\Database\Eloquent\Factories\Factory;

class RrspMonitoringFactory extends Factory
{
    protected $model = RrspMonitoring::class;

    public function definition(): array
    {
        return [
            'rrsp_no' => 'RRSP-' . $this->faker->unique()->numerify('#####'),
            'date_received' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'item_description' => $this->faker->sentence(6),
            'quantity' => $this->faker->numberBetween(1, 200),
            'property_no' => strtoupper($this->faker->bothify('PROP-###')),
            'end_user_name' => Office::inRandomOrder()->value('office_name'),
            'cost' => $this->faker->randomFloat(2, 100, 10000),
            'kind_of_semi_expendable' => $this->faker->randomElement(['Furniture', 'Electronics', 'Tools', 'Office Equipment']),
            'status' => $this->faker->randomElement(['Active', 'Inactive', 'Disposed']),
            'area' => $this->faker->city(),
        ];
    }
}
