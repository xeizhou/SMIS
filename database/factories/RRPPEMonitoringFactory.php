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
            'end_user_name' => Office::inRandomOrder()->value('office_name'),
            'return_by' => $this->faker->name(),
        ];
    }
}
