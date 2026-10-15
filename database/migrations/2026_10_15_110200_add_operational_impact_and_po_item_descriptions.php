<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            if (!Schema::hasColumn('serve_po', 'operational_impact')) {
                $table->string('operational_impact', 50)->nullable()->after('item_description');
            }
        });

        if (!Schema::hasTable('po_item_descriptions')) {
            Schema::create('po_item_descriptions', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->timestamps();
            });
        }

        $defaults = [
            'ICT/EQUIPMENT',
            'OFFICE SUPPLIES',
            'OFFICE EQUIPMENT',
            'LABORATORY',
            'CONSTRUCTION SUPPLIES',
            'SERVICES',
            'TOKEN & SOUVENIRS',
        ];

        $now = now();
        foreach ($defaults as $name) {
            DB::table('po_item_descriptions')->updateOrInsert(
                ['name' => $name],
                ['created_at' => $now, 'updated_at' => $now]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            if (Schema::hasColumn('serve_po', 'operational_impact')) {
                $table->dropColumn('operational_impact');
            }
        });

        Schema::dropIfExists('po_item_descriptions');
    }
};
