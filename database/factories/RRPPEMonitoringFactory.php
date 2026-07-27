<?php

namespace Database\Factories;

use App\Models\RRPPEMonitoring;
use App\Models\Office;
use Illuminate\Database\Eloquent\Factories\Factory;

class RRPPEMonitoringFactory extends Factory
{
    protected $model = RRPPEMonitoring::class;

    public function definition(): array
    {
        return [
            'rrppe_no' => 'RRPPE-' . $this->faker->unique()->numerify('#####'),
            'date_received' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'item_description' => $this->faker->sentence(6),
            'quantity' => $this->faker->numberBetween(1, 200),
            'property_no' => strtoupper($this->faker->bothify('PROP-###')),
            'end_user_name' => Office::inRandomOrder()->value('office_name'),
            'cost' => $this->faker->randomFloat(2, 100, 10000),
            'status' => $this->faker->randomElement(['In Use', 'For Repair', 'Disposed', 'Idle']),
            'area' => $this->faker->city(),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }
}
