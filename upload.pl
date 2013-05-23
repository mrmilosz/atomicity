#!/usr/bin/perl -wT 

use strict;
use CGI;
use CGI::Carp qw(fatalsToBrowser);
use File::Basename;
use Data::Dumper;

my $cgi = new CGI();
print $cgi->header(); # for debugging
print $cgi->param('uploaded_file');
print $cgi->uploadInfo($cgi->param('uploaded_file'));

my $upload_dir = 'xml';
my $filename = 'test.xml'; # temporary

open (DESTINATION_FILE, ">$upload_dir/$filename") or die "$!";
binmode DESTINATION_FILE;

my $source_file_handle = $cgi->upload('meta.xml');
while (<$source_file_handle>) {
	 print DESTINATION_FILE;
}

close UPLOADFILE;
