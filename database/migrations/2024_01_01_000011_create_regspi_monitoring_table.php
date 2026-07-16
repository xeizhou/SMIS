<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regspi_monitoring', function (Blueprint $table) {
            $table->id('regspi_id');
            $table->string('month_year', 20);
            $table->string('ics_no', 50)->nullable();

            // FK is nullable in source data (empty-string values were fixed to NULL
            // in the seed data since '' is not a valid match for a nullable FK).
            $table->string('rrsp_no', 50)->nullable();

            $table->string('semi_expendable_property_no', 100);
            $table->string('item_description', 255);
            $table->integer('estimated_useful_life')->nullable();
            $table->integer('issued_qty')->default(0);
            $table->string('issued_office_officer', 255)->nullable();
            $table->integer('returned_qty')->default(0);
            $table->string('returned_office_officer', 255)->nullable();
            $table->integer('reissued_qty')->default(0);
            $table->string('reissued_office_officer', 255)->nullable();
            $table->integer('disposed_qty')->default(0);
            $table->integer('balance_qty')->default(0);
            $table->decimal('amount', 15, 2);
            $table->string('remarks', 255)->nullable();
            $table->timestamps();

            $table->foreign('rrsp_no', 'fk_regspi_rrsp_no')
                ->references('rrsp_no')->on('rrsp_monitoring')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regspi_monitoring');
    }
};
