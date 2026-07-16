<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bona_vida_monitoring', function (Blueprint $table) {
            $table->id('bvm_id');
            $table->date('date_received');

            $table->string('office_code', 20);

            $table->integer('qty');
            $table->decimal('price', 10, 2);
            $table->decimal('total_amount', 12, 2);
            $table->integer('invoice_no');
            $table->date('invoice_date');
            $table->string('remarks', 255)->nullable();
            $table->timestamps();

            $table->foreign('office_code', 'fk_bonavida_office')
                ->references('office_code')->on('offices')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bona_vida_monitoring');
    }
};
