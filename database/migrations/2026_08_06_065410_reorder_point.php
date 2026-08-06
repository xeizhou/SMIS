<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            // Per-item reorder point used by the dashboard to flag "Low Stock".
            // Defaults to 10 to match the previous hardcoded threshold.
            $table->unsignedInteger('reorder_point')->nullable()->after('description');
        });

        // Some DB drivers don't retroactively apply a column DEFAULT to
        // pre-existing rows, which leaves reorder_point NULL and breaks
        // anything typed as int. Backfill explicitly.
        \DB::table('stock_items')->whereNull('reorder_point')->update(['reorder_point' => 10]);

        Schema::table('stock_items', function (Blueprint $table) {
            $table->unsignedInteger('reorder_point')->default(10)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropColumn('reorder_point');
        });
    }
};