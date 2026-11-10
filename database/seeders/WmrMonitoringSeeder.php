<?php

namespace Database\Seeders;

use App\Models\WmrMonitoring;
use Illuminate\Database\Seeder;

class WmrMonitoringSeeder extends Seeder
{
    public function run(): void
    {
        if (WmrMonitoring::query()->exists()) {
            return;
        }

        WmrMonitoring::factory(40)->create()->each(function (WmrMonitoring $wmr): void {
            $descriptions = [];

            foreach (range(1, fake()->numberBetween(1, 4)) as $itemNumber) {
                $description = fake()->sentence(4);
                $descriptions[] = $description;

                $wmr->items()->create([
                    'item_number' => $itemNumber,
                    'quantity' => fake()->randomFloat(2, 1, 5),
                    'unit' => fake()->randomElement(['PC', 'SET', 'LOT']),
                    'description' => $description,
                    'item_control_no' => sprintf('%s-%02d', $wmr->wmr_no, $itemNumber),
                ]);
            }

            $wmr->update([
                'defects_complaints' => implode(PHP_EOL, $descriptions),
                'materials' => implode(PHP_EOL, $descriptions),
            ]);
        });
    }
}
