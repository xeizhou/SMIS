<?php

namespace Database\Factories;

use App\Models\ServePo;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class DeliveryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'delivery_id' => 'DEL-' . Str::upper(Str::random(8)),
            'delivery_date' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'po_date_received' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'delivery_term' => $this->faker->numberBetween(15, 60),
            'due_date' => $this->faker->dateTimeBetween('now', '+1 month'),
            'no_of_days_ld' => $this->faker->numberBetween(0, 10),
            'received_by_1' => $this->faker->name(),
            'received_by_2' => $this->faker->name(),
            'place_of_delivery' => $this->faker->address(),
            'status' => $this->faker->randomElement(['PARTIAL', 'COMPLETE', 'PENDING', 'CANCELLED']),   
            'remarks' => $this->faker->optional()->sentence(),
            'total_amount_delivered' => $this->faker->randomFloat(2, 1000, 200000),
            'po_total_amount' => $this->faker->randomFloat(2, 1000, 200000),
            'folder_link' => $this->faker->optional()->url(),
        ];
        // po_number, supplier_id, end_user set explicitly in the seeder from the ServePo it's tied to
    }

    /** Attach this delivery to a specific PO, pulling supplier/end_user/amount from it. */
    public function forServePo(ServePo $po): static
    {
        return $this->state(fn () => [
            'po_number' => $po->po_number,
            'supplier_id' => $po->supplier_id,
            'end_user' => $po->end_user,
            'po_total_amount' => $po->total_amount_po,
        ]);
    }
}