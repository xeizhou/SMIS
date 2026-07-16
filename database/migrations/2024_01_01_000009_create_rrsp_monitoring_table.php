<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX: same id-vs-PK issue. `id` is the true auto-increment
     * PK; `rrsp_no` (originally the sole PK) becomes UNIQUE instead — this is
     * required because regspi_monitoring's FK references rrsp_no directly.
     */
    public function up(): void
    {
        Schema::create('rrsp_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('rrsp_no', 50)->unique();
            $table->date('date_received');
            $table->text('item_description');
            $table->integer('quantity');
            $table->string('property_no', 50)->nullable();
            $table->string('end_user_name', 100)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('kind_of_semi_expendable', 50)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rrsp_monitoring');
    }
};
