<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX: same id-vs-PK issue. `id` is the true auto-increment
     * PK; the original composite PK (rrppe_no, property_no) becomes a
     * UNIQUE constraint instead.
     */
    public function up(): void
    {
        Schema::create('rrppe_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('rrppe_no', 50);
            $table->date('date_received');
            $table->text('item_description');
            $table->integer('quantity');
            $table->string('property_no', 50);
            $table->string('end_user_name', 100)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['rrppe_no', 'property_no'], 'uq_rrppe_pk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rrppe_monitoring');
    }
};
