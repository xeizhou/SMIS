<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rrsp_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rrsp_monitoring_id')->constrained('rrsp_monitoring')->onDelete('cascade');
            $table->string('item_name')->nullable();
            $table->text('item_description');
            $table->integer('quantity');
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->text('remarks')->nullable();
            $table->string('kind_of_semi_expendable', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rrsp_items');
    }
};
