<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clearance', function (Blueprint $table) {
            $table->id('clearance_id');
            $table->string('name', 100);

            $table->string('office', 20);

            $table->date('claim_date');
            $table->string('received_by', 100);
            $table->string('status', 50);
            $table->boolean('cleared')->default(false);
            $table->boolean('pending')->default(false);
            $table->string('remarks', 255)->nullable();
            $table->timestamps();

            $table->foreign('office', 'fk_clearance_office')
                ->references('office_code')->on('offices')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clearance');
    }
};
