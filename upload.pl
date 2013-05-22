#!/usr/bin/perl -wT

use strict;
use CGI;
use CGI::Carp qw(fatalsToBrowser);
use File::Basename;
use Data::Dumper;

my $upload_dir = 'xml';
my $query = new CGI();
print $query->header();

my @files = $query->param;

my $filename = 'test.xml';

open (UPLOADFILE, ">$upload_dir/$filename") or die "$!";
binmode UPLOADFILE;

my $upload_filehandle = $query->upload('data');
while (<$upload_filehandle>) {
	 print UPLOADFILE;
}

close UPLOADFILE;
