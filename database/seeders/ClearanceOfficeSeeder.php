<?php

namespace Database\Seeders;

use App\Models\ClearanceOffice;
use Illuminate\Database\Seeder;

class ClearanceOfficeSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            'Library',
            'Registrar',
            'Accounting Office',
            'Property and Supply Office',
            'Human Resource Office',
        ];

        foreach ($offices as $name) {
            ClearanceOffice::firstOrCreate(['clearance_office_name' => $name]);
        }
    }
}