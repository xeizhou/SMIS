<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class OfficeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'office_code' => strtoupper($this->faker->unique()->lexify('OFC-???')),
            'office_name' => $this->faker->randomElement([
                'College of Engineering', 'College of Business', 'Registrar',
                'Human Resources', 'Procurement Office', 'Accounting Office',
            ]),
            'entity_name' => 'University of Southeastern Philippines',
            'office_head' => $this->faker->name(),
        ];
    }
}