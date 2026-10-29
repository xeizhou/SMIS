<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        if (!$admin) return;

        Task::firstOrCreate(
            ['title' => 'Follow up supplier on delivery schedule', 'assigned_to' => $admin->id],
            [
                'description' => 'Supplier Carter, Dietrich and Gleichner needs confirmation on batch arrival.',
                'po_number' => 'PO-6772-3114',
                'assigned_by' => $admin->id,
                'priority' => 'urgent',
                'status' => 'pending',
                'due_date' => now()->toDateString(),
            ]
        );

        Task::firstOrCreate(
            ['title' => 'Verify COA stamp requirements for invoice', 'assigned_to' => $admin->id],
            [
                'description' => 'Ensure accounting documents have necessary COA stamp before final release.',
                'po_number' => 'PO-4641-8347',
                'assigned_by' => $admin->id,
                'priority' => 'high',
                'status' => 'pending',
                'due_date' => now()->addDay()->toDateString(),
            ]
        );

        Task::firstOrCreate(
            ['title' => 'Review property voucher release document', 'assigned_to' => $admin->id],
            [
                'description' => 'Prepare final property clearance endorsement voucher.',
                'po_number' => 'PO-3304-2149',
                'assigned_by' => $admin->id,
                'priority' => 'normal',
                'status' => 'pending',
                'due_date' => now()->addDays(3)->toDateString(),
            ]
        );
    }
}

