<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $password = Hash::make('12345678');

        // Protected default admin
        DB::table('users')->updateOrInsert(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Admin',
                'password' => $password,
                'role' => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Additional admin accounts
        foreach (range(2, 4) as $number) {
            DB::table('users')->updateOrInsert(
                ['email' => "admin{$number}@gmail.com"],
                [
                    'name' => "Admin {$number}",
                    'password' => $password,
                    'role' => 'admin',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('users')
            ->whereIn('email', [
                'admin@gmail.com',
                'admin2@gmail.com',
                'admin3@gmail.com',
                'admin4@gmail.com',
            ])
            ->delete();
    }
};