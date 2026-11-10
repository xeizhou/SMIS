<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wmr_monitoring', function (Blueprint $table) {
            $table->string('item_vehicle', 255)->nullable()->change();
        });

        Schema::create('wmr_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wmr_monitoring_id')->constrained('wmr_monitoring')->cascadeOnDelete();
            $table->unsignedInteger('item_number');
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 30);
            $table->text('description');
            $table->string('item_control_no', 100);
            $table->timestamps();

            $table->unique(['wmr_monitoring_id', 'item_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wmr_items');

        DB::table('wmr_monitoring')->whereNull('item_vehicle')->update(['item_vehicle' => '']);
        Schema::table('wmr_monitoring', function (Blueprint $table) {
            $table->string('item_vehicle', 255)->nullable(false)->change();
        });
    }
};
