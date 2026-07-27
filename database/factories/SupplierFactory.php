<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierFactory extends Factory
{
    public function definition(): array
    {
        return [
            'supplier_name' => $this->faker->company(),
            'contact_number' => $this->faker->numerify('09#########'),
            'email_address' => $this->faker->unique()->companyEmail(),
            'status' => $this->faker->randomElement(['active', 'inactive']),
        ];
    }
}