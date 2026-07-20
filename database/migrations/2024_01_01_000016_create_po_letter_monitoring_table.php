<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_letter_monitoring', function (Blueprint $table) {
            // ASSUMPTION / FIX: source SQL used the composite
            // (po_number, type_of_letter) as PRIMARY KEY with a separate
            // non-unique `id` AUTO_INCREMENT column. SQLite requires an
            // autoincrementing column to itself be the INTEGER PRIMARY KEY,
            // so — as with the *_Monitoring tables above — `id` becomes the
            // real primary key and the original composite key becomes a
            // UNIQUE constraint instead (still fully enforced).
            $table->id();

            $table->string('reference_no', 50)->nullable();

            $table->foreignId('supplier_id')
                ->constrained('supplier_list', 'supplier_id')
                ->restrictOnDelete();

            $table->string('po_number', 50);
            $table->date('po_date');
            $table->date('date_received_by_supplier')->nullable();
            $table->string('delivery_term', 50)->nullable();
            $table->date('due_date')->nullable();
            $table->string('office_end_user', 100);
            $table->enum('type_of_letter', [
                'EXTENSION', 'WAIVER', 'CANCELLATION', 'REPLACEMENT/ALTERNATIVE OFFER',
            ]);
            $table->date('date_received_by_smu')->nullable();
            $table->date('date_forwarded_to_ovpad')->nullable();
            $table->string('received_by', 50)->nullable();
            $table->string('status_of_the_letter', 50);
            $table->string('document_link', 500)->nullable();
            $table->date('date_forwarded_to_end_user')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['po_number', 'type_of_letter'], 'uq_po_letter_pk');

            $table->foreign('po_number', 'fk_letter_po_number')
                ->references('po_number')->on('serve_po')
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_letter_monitoring');
    }
};