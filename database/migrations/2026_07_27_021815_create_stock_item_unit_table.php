<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_item_unit', function (Blueprint $table) {
            $table->string('stock_no', 50);
            $table->foreignId('unitID')->constrained('units', 'unitID')->cascadeOnDelete();
            $table->boolean('is_default')->default(false);

            $table->primary(['stock_no', 'unitID']);
            
            // Added cascadeOnUpdate() here!
            $table->foreign('stock_no')
                  ->references('stock_no')
                  ->on('stock_items')
                  ->cascadeOnUpdate()
                  ->cascadeOnDelete();
        });

        // Optional but recommended: Drop the old column to prevent confusion
        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropForeign(['unitID']);
            $table->dropColumn('unitID');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_item_unit');

        Schema::table('stock_items', function (Blueprint $table) {
            $table->foreignId('unitID')->nullable()->constrained('units', 'unitID')->nullOnDelete();
        });
    }
};