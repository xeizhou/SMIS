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
            'end_user_name' => Office::inRandomOrder()->value('office_name'),
        ];
    }
}