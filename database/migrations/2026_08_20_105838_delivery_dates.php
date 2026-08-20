<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_dates', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_id', 50);
            $table->date('delivery_date');
            $table->timestamps();

            $table->foreign('delivery_id', 'fk_delivery_dates_delivery_id')
                ->references('delivery_id')->on('delivery')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_dates');
    }
};